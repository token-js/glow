import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";

type Props = {
  handleDidSignin: (user: User, session: Session) => Promise<void>;
};

export const SignInWithApple: React.FC<Props> = ({ handleDidSignin }) => {
  if (Platform.OS === "ios")
    return (
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={5}
        style={{ width: 300, height: 50 }}
        onPress={async () => {
          console.log("attempting signin");
          try {
            const credential = await AppleAuthentication.signInAsync({
              requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
              ],
            });
            console.log(credential);
            console.log("trying to sign in with supabase");
            // Sign in via Supabase Auth.
            if (credential.identityToken) {
              const { error, data } = await supabase.auth.signInWithIdToken({
                provider: "apple",
                token: credential.identityToken,
              });
              console.log("done");
              console.log(JSON.stringify({ error, user: data.user }, null, 2));
              if (!error) {
                await handleDidSignin(data.user, data.session);
              }
            } else {
              throw new Error("No identityToken.");
            }
          } catch (e: any) {
            console.error(e);
            if (e.code === "ERR_REQUEST_CANCELED") {
              // handle that the user canceled the sign-in flow
            } else {
              throw e;
            }
          }
        }}
      />
    );

  return <></>;
};
