// Copyright (C) 2020 Toitware ApS. All rights reserved.

import * as grpc from "@grpc/grpc-js"
import { AuthClient } from "@toit/api/src/toit/api/auth_grpc_pb"
import { AuthResponse, LoginRequest } from "@toit/api/src/toit/api/auth_pb"
import { DeviceServiceClient } from "@toit/api/src/toit/api/device_grpc_pb"
import { Device, ListDevicesRequest, ListDevicesResponse } from "@toit/api/src/toit/api/device_pb"

async function main() {
  if (process.argv.length != 4) {
    console.error("must be called with <username> and <password> as arguments");
    return;
  }

  const credentials = grpc.credentials.createSsl();
  const auth = await login(credentials, process.argv[2], process.argv[3]);
  const token = Buffer.from(auth.getAccessToken_asU8()).toString("utf8");

  const channel = new grpc.Channel("api.toit.io",
    grpc.credentials.combineChannelCredentials(credentials,
      grpc.credentials.createFromMetadataGenerator((_, cb) => {
        const md = new grpc.Metadata();
        md.set("Authorization", "Bearer " + token);
        cb(null, md);
      })), {});

  const devices = await listDevices(channel);
  devices.forEach((d: Device) => {
    console.log(d.getConfig().getName());
  });
}

function listDevices(channel: grpc.Channel): Promise<Array<Device>> {
  return new Promise<Array<Device>>((resolve, reject) => {
    const client = new DeviceServiceClient("", null, { channelOverride: channel });
    const request = new ListDevicesRequest();
    client.listDevices(request, function (err: Error | null, response?: ListDevicesResponse) {
      if (err) {
        reject(err);
      } else if (!response) {
        reject("Empty response was returned from list devices")
      } else {
        resolve(response.getDevicesList());
      };
    });
  });
}


function login(credentials: grpc.ChannelCredentials, username: string, password: string): Promise<AuthResponse> {
  return new Promise<AuthResponse>((resolve, reject) => {
    const channel = new grpc.Channel("api.toit.io", credentials, {});
    const client = new AuthClient("", null, { channelOverride: channel });
    const loginRequest = new LoginRequest();
    loginRequest.setUsername(username);
    loginRequest.setPassword(password);
    client.login(loginRequest, function (err: Error | null, response?: AuthResponse) {
      if (err) {
        reject(err);
      } else if (!response) {
        reject("Empty response was returned from login")
      } else {
        resolve(response);
      };
    });
  });
}


main();
