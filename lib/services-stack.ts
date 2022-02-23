import { Vpc } from "@aws-cdk/aws-ec2";
import { Construct, Stack, StackProps } from "@aws-cdk/core";
import { RedisCluster } from "./redis-cache-resource";
import { Secret } from "@aws-cdk/aws-secretsmanager";
import { LogGroup, RetentionDays } from "@aws-cdk/aws-logs";
import { Repository } from "@aws-cdk/aws-ecr";

export class YearnAPIServicesStack extends Stack {
  public readonly vpc: Vpc;
  public readonly redisCluster: RedisCluster;
  public readonly secretsManager: Secret;
  public readonly logGroup: LogGroup;
  public readonly repository: Repository;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.vpc = new Vpc(this, "Vpc", {
      maxAzs: 2,
    });

    this.repository = new Repository(this, "Repository", {
      repositoryName: "yearn-api-repo",
    });

    this.redisCluster = new RedisCluster(this, "RedisCluster", {
      vpc: this.vpc,
      cacheNodeType: "cache.t4g.small",
    });

    this.secretsManager = new Secret(this, "SecretsManager", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          WEB3_HTTP_PROVIDER: "",
          WEB3_HTTP_PROVIDER_FTM_URL: "",
          WEB3_HTTP_PROVIDER_FTM_USERNAME: "",
          WEB3_HTTP_PROVIDER_FTM_PASSWORD: "",
          WEB3_HTTP_PROVIDER_ARB: "",
          REMOTE_WRITE: "",
          REMOTE_WRITE_USERNAME: "",
          REMOTE_WRITE_PASSWORD: "",
          SENTRY_DSN: "",
        }),
        // This is a require property, but we won't actually use it.
        generateStringKey: "_",
      },
    });

    this.logGroup = new LogGroup(this, "LogGroup", {
      logGroupName: "/yearn-api",
      retention: RetentionDays.ONE_MONTH,
    });
  }
}
