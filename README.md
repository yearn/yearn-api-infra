# Welcome to the infrastructure for the Yearn API repo!

This repo contains the infrastructure definition for the [Yearn API (cache)](https://github.com/yearn/yearn-api).

The infrastructure is defined using **[AWS Cloud Development Kit (AWS CDK)](https://aws.amazon.com/cdk/)**.
AWS CDK is an open source software development framework to define your cloud application resources using
familiar programming languages.

These definitions can then be synthesized to AWS CloudFormation Templates which can be deployed AWS.

## Infrastructure Diagram

Below is a visual representation of the infrastructure deployed by this repository.

![Infrastructure Diagram](./assets/YearnAPIInfrastructureDiagram.png)

[Source](https://drive.google.com/file/d/1EwfRPJ4xXlHJZmIlln2HMPakRbILoxbi/view?usp=sharing)

Notable components are:
1. A redis cluster set up in high availability mode. A hot standby running in a different availability zone is promoted to the master if the current master fails.
2. The service is hosted on Fargate containers running in multiple availability zones for high availability
3. An application load balancer spreads out incoming traffic amongst multiple containers running the application
4. An ECR container repository stores docker containers containing different versions of the application

## Setting up the infrastructure

### Bootstrapping

Follow the steps to bootstrap your AWS Account to work with AWS CDK:

1. [Prerequisites](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#getting_started_prerequisites) 
2. [Install AWS CDK Locally](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#getting_started_install)
3. [Bootstrapping](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#getting_started_bootstrap)

The infrastructure in this repository requires a VPC with at least one public subnet. If you don't have a VPC that meets this criteria or want to provision a new VPC for this project, you can follow the instructions [here](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-public-private-vpc.html).

### Creating the infrastructure

#### Dependencies

Install all the dependencies: `npm install`.

#### Create Services

Create all the support services used by the application:

```
cdk --profile "aws-profile-name" deploy YearnAPIStack/YearnAPIServicesStack
```

#### Update Secrets and Initial Container

Navigate to the [Secrets Manager](https://console.aws.amazon.com/secretsmanager/home?region=us-east-1#!/listSecrets/) and add the following secrets:

- WEB3_HTTP_PROVIDER
- WEB3_HTTP_PROVIDER_FTM_PASSWORD
- WEB3_HTTP_PROVIDER_FTM_USERNAME
- WEB3_HTTP_PROVIDER_FTM_URL

Build and upload your first container to your ECR repository:

```
aws --profile aws-profile-name ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 311068046057.dkr.ecr.us-east-1.amazonaws.com
docker pull amazon/amazon-ecs-sample
docker tag amazon/amazon-ecs-sample 311068046057.dkr.ecr.us-east-1.amazonaws.com/yearn-api-repo:latest
docker push 311068046057.dkr.ecr.us-east-1.amazonaws.com/yearn-api-repo:latest
```

**Note:** You may need to change the account id in the snippet above if you are deploying to a different account.

#### Deploy the rest of the infrastructure

`cdk --profile "aws-profile-name" deploy --all`


The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
