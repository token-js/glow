import { supabase } from "@/lib/supabase";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Session, User } from "@supabase/supabase-js";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { GoogleIcon } from "./icon";

type Props = {
  handleDidSignin: (user: User, session: Session) => Promise<void>;
};

export const SignInWithGoogle: React.FC<Props> = ({ handleDidSignin }) => {
  const onPress = async () => {
    console.log("logging in");
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      console.log(userInfo);
      if (userInfo.data?.idToken) {
        console.log("signing in with token");
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: userInfo.data.idToken,
        });
        console.log(data);
        console.log(error);

        if (error) {
          console.error(error);
        }

        if (data.user) {
          await handleDidSignin(data.user, data.session);
        }
      } else {
        throw new Error("no ID token present!");
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // play services not available or outdated
      } else {
        throw error;
      }
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <View style={styles.content}>
        <GoogleIcon />
        <Text style={styles.text}>Sign in with Google</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDDDDD",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 24,
    alignSelf: "center",
    width: 300,
    height: 50,
    marginTop: 10,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  logo: {
    width: 18,
    height: 18,
    marginRight: 12,
  },
  text: {
    color: "#757575",
    fontSize: 20,
    marginLeft: 5,
  },
});
