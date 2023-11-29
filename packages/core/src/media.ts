import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Bucket } from "sst/node/bucket";
import { z } from "zod";

export * as Media from "./media";

export const all = z.function(z.tuple([])).implement(async () => {
  // list all media from s3
  const s3Client = new S3Client({ region: "eu-central-1" });

  const command = new ListObjectsV2Command({
    Bucket: Bucket["bucket"].bucketName,
    Prefix: "media",
  });

  const result = await s3Client.send(command);
  const { Contents } = result;
  if (!Contents) return [];
  let media = [];
  for (const content of Contents) {
    const { Key, LastModified, Size } = content;
    if (!Key || !LastModified || !Size) continue;
    media.push({ id: Key, lastModified: LastModified, size: Size });
  }
  return media;
});

export const get = z.function(z.tuple([z.string()])).implement(async (id) => {
  const s3Client = new S3Client({ region: "eu-central-1" });
  const command = new GetObjectCommand({
    Bucket: Bucket["bucket"].bucketName,
    Key: `media/${id}`,
  });
  const result = await s3Client.send(command);
  const { ContentType, Body } = result;
  if (!ContentType || !Body) throw new Error("No content type or body");

  // send universal s3 link to client
  return {
    link: `https://${Bucket["bucket"].bucketName}.s3.eu-central-1.amazonaws.com/media/${id}`,
    contentType: ContentType,
  };
});

export const getSignedUploadUrl = z.function(z.tuple([z.string()])).implement(async (id) => {
  const s3Client = new S3Client({ region: "eu-central-1" });
  const command = new PutObjectCommand({
    Bucket: Bucket["bucket"].bucketName,
    Key: `media/${id}`,
    ACL: "public-read",
  });
  // get signed url for upload
  const url = await getSignedUrl(s3Client, command, {
    expiresIn: 60 * 60, // 1 hour
  });
  return {
    url,
  };
});

export const remove = z.function(z.tuple([z.string()])).implement(async (id) => {
  const s3Client = new S3Client({ region: "eu-central-1" });
  const command = new DeleteObjectCommand({
    Bucket: Bucket["bucket"].bucketName,
    Key: `media/${id}`,
  });
  const result = await s3Client.send(command);
  if (!result) throw new Error("Could not delete media");
  if (result.$metadata.httpStatusCode !== 204) throw new Error("Could not delete media");
  return true;
});
