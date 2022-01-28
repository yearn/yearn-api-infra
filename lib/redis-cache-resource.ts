import { Construct, ITaggable, TagManager, TagType } from "@aws-cdk/core";
import {
  Connections,
  IConnectable,
  IVpc,
  Port,
  SecurityGroup,
  SubnetType,
} from "@aws-cdk/aws-ec2";
import {
  CfnReplicationGroup,
  CfnParameterGroup,
  CfnSubnetGroup,
} from "@aws-cdk/aws-elasticache";

export interface RedisServiceProps {
  readonly vpc: IVpc;
  readonly securityGroups?: SecurityGroup[];
  readonly cacheNodeType?: string;
}

export class RedisCluster extends Construct implements IConnectable, ITaggable {
  public readonly tags: TagManager;
  public readonly redisCluster: CfnReplicationGroup;
  public readonly connections: Connections;

  constructor(scope: Construct, id: string, props: RedisServiceProps) {
    super(scope, id);

    const { vpc } = props;

    this.tags = new TagManager(TagType.KEY_VALUE, "TagManager");

    const securityGroups = props.securityGroups || [
        new SecurityGroup(this, 'RedisClusterSecurityGroup', {
          description: `Security group for redis cluster service`,
          allowAllOutbound: true,
          vpc,
        }),
      ];

    const redisSubnetGroup = new CfnSubnetGroup(this, "RedisSubnetGroup", {
      description: "Redis Cluster Subnet Group",
      subnetIds: vpc
        .selectSubnets({ subnetType: SubnetType.PRIVATE_WITH_NAT })
        .subnetIds.concat(
          vpc.selectSubnets({ subnetType: SubnetType.PUBLIC }).subnetIds
        ),
    });

    const redisParamGroup = new CfnParameterGroup(this, "RedisParamGroup", {
      cacheParameterGroupFamily: "redis6.x",
      description: "Redis Parameter Group for Redis 6.2",
      properties: {
        databases: "256",
      },
    });

    this.redisCluster = new CfnReplicationGroup(this, "RedisCacheWithReplica", {
      cacheNodeType: props.cacheNodeType,
      engine: "redis",
      engineVersion: "6.2",
      snapshotRetentionLimit: 3,
      snapshotWindow: "19:00-21:00",
      preferredMaintenanceWindow: "mon:21:00-mon:22:30",
      automaticFailoverEnabled: true,
      autoMinorVersionUpgrade: true,
      multiAzEnabled: true,
      replicationGroupDescription: "redis cluster with replicas",
      replicasPerNodeGroup: 1,
      cacheParameterGroupName: redisParamGroup.ref,
      cacheSubnetGroupName: redisSubnetGroup.ref,
      securityGroupIds: securityGroups.map((sg) => sg.securityGroupId),
    });

    this.redisCluster.addDependsOn(redisSubnetGroup)

    this.connections = new Connections({
        securityGroups,
        defaultPort: Port.tcp(6379),
      });
  }

  public get connectionString(): string {
    return `redis://${this.redisCluster.attrPrimaryEndPointAddress}:${this.redisCluster.attrPrimaryEndPointPort}`;
  }
}
