import { Server } from "@hocuspocus/server";

import { handleAuthentication } from "@/core/lib/authentication.js";
import { getExtensions } from "@/core/extensions/index.js";

export const getHocusPocusServer = async () => {
  const extensions = await getExtensions();
  return Server.configure({
    onAuthenticate: async ({
      requestHeaders,
      requestParameters,
      connection,
      // user id used as token for authentication
      token,
    }) => {
      // request headers
      const cookie = requestHeaders.cookie?.toString();
      // params
      const params = requestParameters;

      if (!cookie) {
        throw Error("Credentials not provided");
      }

      try {
        await handleAuthentication({
          connection,
          cookie,
          params,
          token,
        });
      } catch (error) {
        throw Error("Authentication unsuccessful!");
      }
    },
    extensions,
    debounce: 10000
  });
};
