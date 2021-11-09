import ec2 = require('@aws-cdk/aws-ec2');
import ecr = require('@aws-cdk/aws-ecr');
import ecs = require('@aws-cdk/aws-ecs');
import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');
import cdk = require('@aws-cdk/core');
import certificateManager = require('@aws-cdk/aws-certificatemanager');
import {ValidationMethod} from "@aws-cdk/aws-certificatemanager";
import {ApplicationProtocol, ApplicationProtocolVersion} from "@aws-cdk/aws-elasticloadbalancingv2";

const route53 = require('@aws-cdk/aws-route53')

class {TEMPLATE_SERVICE_NAME}ServiceRepository extends cdk.Stack {
  public readonly repository: ecr.IRepository;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // Create ECR repository
    this.repository = new ecr.Repository(this, '{TEMPLATE_SERVICE_HYPHEN_NAME}-service', {
      repositoryName: '{TEMPLATE_SERVICE_HYPHEN_NAME}-service',
    })
  }
}

interface {TEMPLATE_SERVICE_NAME}ServiceRepositoryProps extends cdk.StackProps {
  readonly repository: ecr.IRepository;
}

class {TEMPLATE_SERVICE_NAME}ServiceFargate extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: {TEMPLATE_SERVICE_NAME}ServiceRepositoryProps) {
    super(scope, id, props);

    const zoneName = 'hypto.co.in';
    const domainName = 'hws.{TEMPLATE_SERVICE_HYPHEN_NAME}.hypto.co.in';

    /*
     We try to import  hosted zone from attributes of the Hypto staging account.

     This is a clear HARDCODE!!
     TODO: Make this more generic and working across multiple AWS accounts.
     */
    const domainZone = route53.HostedZone.fromHostedZoneAttributes(this, 'StagingZone', {
      zoneName,
      hostedZoneId: 'Z30STQ6IYSMMOI',
    });

    // Create VPC and Fargate Cluster
    // NOTE: Limit AZs to avoid reaching resource quotas
    const vpc = new ec2.Vpc(this, '{TEMPLATE_SERVICE_NAME}ServiceVpc', { maxAzs: 2 });
    const cluster = new ecs.Cluster(this, '{TEMPLATE_SERVICE_NAME}ServiceCluster', { vpc });

    const certificate = new certificateManager.Certificate(this, 'HyptoCertificate', {
      domainName,
      validationMethod: ValidationMethod.DNS
    });

    // Instantiate Fargate Service with an application load balancer
    new ecs_patterns.ApplicationLoadBalancedFargateService(this, "{TEMPLATE_SERVICE_NAME}Service", {
      cluster,
      protocol: ApplicationProtocol.HTTPS,
      listenerPort: 50051,
      domainName,
      domainZone,
      certificate,
      targetProtocol: ApplicationProtocol.HTTP,
      protocolVersion: ApplicationProtocolVersion.GRPC,
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(props.repository),
        containerPort: 50051
      },
    });
  }
}

const app = new cdk.App();

const repositoryStack = new {TEMPLATE_SERVICE_NAME}ServiceRepository(app, 'repo')
new {TEMPLATE_SERVICE_NAME}ServiceFargate(app, 'service', {
  repository: repositoryStack.repository
})

app.synth();
