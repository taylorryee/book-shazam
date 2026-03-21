import { Text, View ,Button,TextInput} from "react-native";
import {useState} from "react"
import {useRouter} from 'expo-router';
import api from "../api"
import AsyncStorage from "@react-native-async-storage/async-storage";
export default function Index() {
  const router = useRouter()
  const [userName,setUserName] = useState("")


  const login = async (username: string) => {
    try {
      const response = await api.post("/user/login", { username });

      const token = response.data;

    // store token
     await AsyncStorage.setItem("token", response.data.access_token);

    // go to main app
      router.push("/findBook"); // or whatever route you have

    } catch (error: any) {
      console.error(error);
    }
  };


  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <TextInput placeholder = "username" onChangeText = {setUserName}/>
      <Button title = "login" onPress = {()=>login(userName)}/>
    </View>
  );
}


