import { StackContext, Api, Bucket, Queue, SolidStartSite } from "sst/constructs";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";

export function API({ stack }: StackContext) {
  const bucket = new Bucket(stack, "bucket");

  const transcribePolicy = new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      "transcribe:StartTranscriptionJob",
      "transcribe:GetTranscriptionJob",
      "transcribe:ListTranscriptionJobs",
      "transcribe:DeleteTranscriptionJob",
    ],
    resources: ["*"],
  });

  const queue = new Queue(stack, "queue", {
    consumer: {
      function: {
        handler: "packages/functions/src/lambda/transcribe.process",
        bind: [bucket],
      },
    },
  });

  queue.attachPermissions([transcribePolicy]);

  const api = new Api(stack, "api", {
    defaults: {
      function: {
        bind: [bucket, queue],
      },
    },
    routes: {
      // transcribe
      "POST /transcript": "packages/functions/src/lambda/transcribe.create",
      "GET /transcript/all": "packages/functions/src/lambda/transcribe.all",
      "GET /transcript/{id}": "packages/functions/src/lambda/transcribe.get",
      // media
      "DELETE /media/{id}": "packages/functions/src/lambda/media.remove",
      "GET /media/all": "packages/functions/src/lambda/media.all",
      "POST /media/signed": "packages/functions/src/lambda/media.getSignedUploadUrl",
      "GET /media/{id}": "packages/functions/src/lambda/media.get",
    },
  });

  api.attachPermissions([transcribePolicy]);

  const solidStartApp = new SolidStartSite(stack, "solidstartapp", {
    path: "packages/frontend",
    bind: [api, queue, bucket],
    environment: {
      VITE_API_BASE: api.url,
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
    BucketName: bucket.bucketName,
    QueueName: queue.queueName,
    QueueUrl: queue.queueUrl,

    // frontend
    FrontendUrl: solidStartApp.url || "http://localhost:3000",
  });
}
