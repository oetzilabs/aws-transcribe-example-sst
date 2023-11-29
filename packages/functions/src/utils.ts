import { StatusCodes } from "http-status-codes";

export const error = (input: unknown, statusCode: StatusCodes = StatusCodes.BAD_REQUEST) => ({
  statusCode,
  body: JSON.stringify({ error: input }),
  headers: {
    "Content-Type": "application/json",
  },
});

export const json = (input: unknown, statusCode: StatusCodes = StatusCodes.OK) => ({
  statusCode,
  body: JSON.stringify(input),
  headers: {
    "Content-Type": "application/json",
  },
});

export const text = (input: string, statusCode: StatusCodes = StatusCodes.OK) => ({
  statusCode,
  body: input,
  headers: {
    "Content-Type": "text/plain",
  },
});
