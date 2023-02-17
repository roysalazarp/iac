#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ProjectStack } from '../lib/project-stack';

export interface ProjectStackProps extends cdk.StackProps {
  projectName: string;
  vpcId: string;
  publicSubnetName: string;
  webServerSecurityGroupId: string;
  webServerRoleId: string;
  ec2InstanceId: string;
  keyPairId: string,
  s3BucketId: string;
  s3BucketName: string;
  elasticIpId: string;
  ec2ElasticIpAssociationId: string;
}

const env = {};

const prefx = "Project"

const props: ProjectStackProps = {
  ...env,
  projectName: 'project',
  vpcId: 'MyVpc',
  publicSubnetName: prefx,
  webServerSecurityGroupId: `${prefx}WebServerSecurityGroup`,
  webServerRoleId: `${prefx}WebServerRole`,
  keyPairId: `${prefx}KeyPair`,
  ec2InstanceId: `${prefx}EC2Instance`,
  s3BucketId: `${prefx}S3Bucket`,
  s3BucketName: `my-${prefx.toLowerCase()}`,
  elasticIpId: `${prefx}ElasticIp`,
  ec2ElasticIpAssociationId: `${prefx}EC2ElasticIpAssociation`,
}

const app = new cdk.App();
new ProjectStack(app, 'ProjectStack', props);
