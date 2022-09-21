import { useState } from "react";
import dynamic from "next/dynamic";
import {
  getKeyCredentialCreationOptions,
  getRequestOptions,
} from "../utils/webauthn";

// import the component client-side only
const WebAuthnSupportTable = dynamic(
  () => import("../components/WebAuthnSupportTable"),
  { ssr: false }
);

enum STATUS {
  NOT_REGISTERED,
  LOGGED,
  NOT_LOGGED,
}

export default function Home() {
  const [username, setUsername] = useState<string>("");
  const [status, setStatus] = useState<STATUS>(STATUS.NOT_REGISTERED);

  const register = async () => {
    try {
      // fetch the challenge and the userId
      const [challengeRes, userIdRes] = await Promise.all([
        fetch("/api/webauthn/challenge"),
        fetch("/api/userId", {
          method: "POST",
          body: JSON.stringify({ username }),
        }),
      ]);
      const [challenge, { userId }] = await Promise.all([
        challengeRes.arrayBuffer(),
        userIdRes.json(),
      ]);

      // get the current domain
      const currentDomain = window.location.hostname;

      // create the options for webauthn
      const options = getKeyCredentialCreationOptions(
        challenge,
        currentDomain,
        username,
        Buffer.from(userId, "utf8")
      );

      // create the credential
      const credential = await navigator.credentials.create(options);

      // set the status
      setStatus(STATUS.NOT_LOGGED);

      // reset the input
      setUsername("");

      // log the certificate created by the authenticator during the registration process
      console.log(
        "Here's the certificate created by the authenticator you chose during the registration process",
        "\n",
        credential
      );

      /**
       * @TODO At this point, the challenge, the username and the credential need to be returned to the server
       * The server has the responsibility to verify if the challenge matches the one previously returned
       * and it must validate the certificate generated by the authenticator
       * If everything is good, the certificate and the username would be stored
       */
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const login = async () => {
    try {
      const res = await fetch("/api/webauthn/challenge");
      const challenge = await res.arrayBuffer();

      // create the options for webauthn
      const options = getRequestOptions(challenge);

      // create the credential
      const credential = await navigator.credentials.get(options);

      // flag the user as logged
      setStatus(STATUS.LOGGED);

      // log the certificate created by the authenticator during the authentification process
      console.log(
        "Here's the certificate created by the authenticator you chose during the authentification process",
        "\n",
        credential
      );

      /**
       * @TODO At this point, the challenge and the credential need to be returned to the server
       * The server has the responsibility to verify if the challenge matches the one previously returned
       * and it must validate the certificate generated by the authenticator
       */
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", rowGap: "1rem" }}>
      <WebAuthnSupportTable />
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          rowGap: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <label htmlFor="username">Display name (facultative)</label>
          <input
            name="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="0xWebAuthn"
          />
        </div>
        <div style={{ display: "flex", columnGap: "0.4rem" }}>
          <button onClick={register}>register</button>
          <button onClick={login}>
            {status !== STATUS.LOGGED ? "login" : "changer de compte"}
          </button>
        </div>
        <p>{status == STATUS.LOGGED ? "Connecté ✅" : null}</p>
      </section>
      <p style={{ fontStyle: "italic" }}>
        This implementation use the resident key to offer a usernameless flow
      </p>
    </main>
  );
}
