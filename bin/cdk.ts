#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PortfolioStack } from '../lib/portfolio-stack';

export interface PortfolioStackProps extends cdk.StackProps {
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

const prefx = "Portfolio"

const props: PortfolioStackProps = {
  ...env,
  projectName: 'portfolio',
  vpcId: 'PersonalProjectsVpc',
  publicSubnetName: prefx,
  webServerSecurityGroupId: `${prefx}WebServerSecurityGroup`,
  webServerRoleId: `${prefx}WebServerRole`,
  keyPairId: `${prefx}KeyPair`,
  ec2InstanceId: `${prefx}EC2Instance`,
  s3BucketId: `${prefx}S3Bucket`,
  s3BucketName: `${prefx.toLowerCase()}-roy-salazar`,
  elasticIpId: `${prefx}ElasticIp`,
  ec2ElasticIpAssociationId: `${prefx}EC2ElasticIpAssociation`,
}

const app = new cdk.App();
new PortfolioStack(app, 'PortfolioStack', props);
