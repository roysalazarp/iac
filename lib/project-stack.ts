import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { readFileSync } from 'fs';
import { ProjectStackProps } from "../bin/cdk";
import * as fs from 'fs';

export class ProjectStack extends Stack {
  private stackProps: ProjectStackProps;

  constructor(scope: Construct, id: string, props: ProjectStackProps) {
    super(scope, id, props);
    this.stackProps = props

    const vpc = this.createVpc()
    const securityGroup = this.createSecurityGroup(vpc)
    const webServerRole = this.createWebServerRole()
    const machineImage = this.defineMachineImage()
    const keyPair = this.transferKeyPair()
    const ec2Instance = this.createEc2Instance(vpc, securityGroup, webServerRole, machineImage, keyPair)
    this.createElasticIP(ec2Instance)
    this.createS3Bucket()
  }

  private createVpc(): ec2.Vpc {
    // We create a VPC with a 10.0.0.0/24 cidr block (254 private IP 
    // addresses we can distribute amongst the VPC subnets).
    const vpc = new ec2.Vpc(this, this.stackProps.vpcId, {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/24'),
      maxAzs: 1,
      
      // We create 1 public Subnet in which we will run the full stack 
      // application in one EC2 instance.
      subnetConfiguration: [
        {
          // This subnet is meant to run only one EC2 instance 
          // (full stack application), therefore a cidrMask 
          // of /28 (14 usable Ip addresses) will be more than enough.
          cidrMask: 28,
          name: this.stackProps.publicSubnetName,
          // PUBLIC subnets have access to the internet via an Internet 
          // Gateway and can be accessed from the internet as long as 
          // they have a public IP address.
          subnetType: ec2.SubnetType.PUBLIC,
        }
      ],
    });
    return vpc
  }

  private createSecurityGroup(vpc: ec2.Vpc): ec2.SecurityGroup {
    const webServerSecurityGroup = new ec2.SecurityGroup(this,  this.stackProps.webServerSecurityGroupId, {
      vpc,
      allowAllOutbound: true
    });

    // Configure security group
    webServerSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'allow ssh access from the world');
    webServerSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow inbound HTTP');
    webServerSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow inbound HTTPS');
    return webServerSecurityGroup
  }

  private createWebServerRole(): iam.Role {
    const webServerRole = new iam.Role(this, this.stackProps.webServerRoleId, {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      // Assign S3 acces to webServerRole
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
      ],
    });
    return webServerRole
  }

  private defineMachineImage(): ec2.IMachineImage {
    const machineImage = ec2.MachineImage.fromSsmParameter(
      '/aws/service/canonical/ubuntu/server/focal/stable/current/amd64/hvm/ebs-gp2/ami-id',
      { os: ec2.OperatingSystemType.LINUX }
    )
    return machineImage
  }
  private transferKeyPair(): ec2.CfnKeyPair {
    const keyName = `${this.stackProps.projectName}-ec2-key-pair`
    const publicKeyMaterial = fs.readFileSync(`./secrets/${keyName}.pub`).toString()
    // this might fail of keypair already exists.
    return new ec2.CfnKeyPair(this, this.stackProps.keyPairId , {
      keyName,
      keyType: 'rsa',
      publicKeyMaterial
    });
  }
  private createEc2Instance(
    vpc: ec2.Vpc, 
    webServerSecurityGroup: ec2.SecurityGroup,
    webServerRole: iam.Role, 
    machineImage: ec2.IMachineImage, 
    keyPair: ec2.CfnKeyPair, 
  ): ec2.Instance {
    const ec2Instance = new ec2.Instance(this, this.stackProps.ec2InstanceId, {
      vpc,
      vpcSubnets: {
        subnets: [...vpc.publicSubnets]
      },
      role: webServerRole,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      // If a key with that name does not exist in your default AWS region, 
      // you will get an error when trying to deploy the EC2 instance.
      keyName: keyPair.keyName,
      machineImage: machineImage,
      securityGroup: webServerSecurityGroup,
    });

    const userDataScript = readFileSync('./lib/user-data.sh', 'utf8');
    ec2Instance.addUserData(userDataScript);

    return ec2Instance
  }

  private createElasticIP(ec2Instance: ec2.Instance): void {
    const elasticIP = new ec2.CfnEIP(this, this.stackProps.elasticIpId);

    // Associate Elastic Ip to EC2 instance.
    new ec2.CfnEIPAssociation(this, this.stackProps.ec2ElasticIpAssociationId, {
      eip: elasticIP.ref,
      instanceId: ec2Instance.instanceId
    });
  }

  private createS3Bucket(): void {
    new s3.Bucket(this, this.stackProps.s3BucketId, {
      publicReadAccess: false,
      bucketName: this.stackProps.s3BucketName
    });
  }
}