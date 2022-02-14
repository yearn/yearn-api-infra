import { Cluster } from "@aws-cdk/aws-ecs";
import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { YearnAPIServicesStack } from "./services-stack";
import { ApplicationLoadBalancedFargateService } from "@aws-cdk/aws-ecs-patterns";
import * as ecs from "@aws-cdk/aws-ecs";
import { Port } from "@aws-cdk/aws-ec2";
import { Certificate } from '@aws-cdk/aws-certificatemanager';

export interface YearnAPIECSStackProps extends StackProps {
  readonly servicesStack: YearnAPIServicesStack;
  readonly certArn: string;
}

export class YearnAPIECSStack extends Stack {
  constructor(scope: Construct, id: string, props: YearnAPIECSStackProps) {
    super(scope, id, props);

    const { servicesStack } = props;

    const cluster = new Cluster(this, "Cluster", {
      vpc: servicesStack.vpc,
      clusterName: "yearn-api-cluster",
      enableFargateCapacityProviders: true,
    });

    const cert = Certificate.fromCertificateArn(this, "Certificate", props.certArn);

    const fargateService = new ApplicationLoadBalancedFargateService(
      this,
      "YearnAPIFargateService",
      {
        cluster,
        memoryLimitMiB: 1024,
        cpu: 512,
        serviceName: "YearnAPIService",
        desiredCount: 3,
        certificate: cert,
        redirectHTTP: true,
        taskImageOptions: {
          image: ecs.ContainerImage.fromEcrRepository(
            servicesStack.repository,
            "latest"
          ),
          containerName: "YearnAPI",
          enableLogging: true,
          logDriver: new ecs.AwsLogDriver({
            streamPrefix: "yearn-api",
            logGroup: servicesStack.logGroup,
            mode: ecs.AwsLogDriverMode.NON_BLOCKING,
          }),
          environment: {
            API_MIGRATION_URL: "https://api.yearn.finance",
            REDIS_CONNECTION_STRING:
              servicesStack.redisCluster.connectionString,
            PORT: "80",
            FASTIFY_ADDRESS: "0.0.0.0",
            NODE_ENV: "production",
          },
          secrets: {
            WEB3_HTTP_PROVIDER: ecs.Secret.fromSecretsManager(
              servicesStack.secretsManager,
              "WEB3_HTTP_PROVIDER"
            ),
            WEB3_HTTP_PROVIDER_FTM_URL: ecs.Secret.fromSecretsManager(
              servicesStack.secretsManager,
              "WEB3_HTTP_PROVIDER_FTM_URL"
            ),
            WEB3_HTTP_PROVIDER_FTM_USERNAME: ecs.Secret.fromSecretsManager(
              servicesStack.secretsManager,
              "WEB3_HTTP_PROVIDER_FTM_USERNAME"
            ),
            WEB3_HTTP_PROVIDER_FTM_PASSWORD: ecs.Secret.fromSecretsManager(
              servicesStack.secretsManager,
              "WEB3_HTTP_PROVIDER_FTM_PASSWORD"
            ),
            SENTRY_DSN: ecs.Secret.fromSecretsManager(
              servicesStack.secretsManager,
              "SENTRY_DSN"
            ),
          },
        },
      }
    );

    servicesStack.repository.grantPull(
      fargateService.service.taskDefinition.obtainExecutionRole()
    );
    servicesStack.secretsManager.grantRead(
      fargateService.service.taskDefinition.obtainExecutionRole()
    );

    fargateService.service.taskDefinition.addContainer("MetricsCollector", {
      image: ecs.ContainerImage.fromAsset("docker/grafana"),
      containerName: "MetricsCollector",
      logging: new ecs.AwsLogDriver({
        streamPrefix: "yearn-api-metrics",
        logGroup: servicesStack.logGroup,
        mode: ecs.AwsLogDriverMode.NON_BLOCKING,
      }),
      secrets: {
        REMOTE_WRITE:  ecs.Secret.fromSecretsManager(
          servicesStack.secretsManager,
          "REMOTE_WRITE"
        ),
        REMOTE_WRITE_USERNAME: ecs.Secret.fromSecretsManager(
          servicesStack.secretsManager,
          "REMOTE_WRITE_USERNAME"
        ),
        REMOTE_WRITE_PASSWORD: ecs.Secret.fromSecretsManager(
          servicesStack.secretsManager,
          "REMOTE_WRITE_PASSWORD"
        ),
      },
    }
    );

    fargateService.service.connections.allowTo(
      servicesStack.redisCluster,
      Port.tcp(6379),
      "Redis"
    );
  }
}
