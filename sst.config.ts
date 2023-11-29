import { SSTConfig } from "sst";
import { API } from "./stacks/MyStack";

export default {
  config(_input) {
    return {
      name: "aws-transcribe-example-sst",
      region: "eu-central-1",
    };
  },
  stacks(app) {
    app.stack(API);
  },
} satisfies SSTConfig;
