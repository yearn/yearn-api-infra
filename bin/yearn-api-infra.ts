#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { YearnAPIECSStack } from "../lib/yearn-api-stack";
import { YearnAPIServicesStack } from "../lib/services-stack";
import { Construct, StackProps } from "@aws-cdk/core";

export class YearnAPIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const servicesStack = new YearnAPIServicesStack(
      this,
      "YearnAPIServicesStack",
      props
    );
    new YearnAPIECSStack(this, "YearnAPIECSStack", {
      ...props,
      servicesStack,
    });
  }
}

const app = new cdk.App();
new YearnAPIStack(app, "YearnAPIStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
