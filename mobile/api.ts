// api/client.ts
import axios from "axios";

const api = axios.create({
  baseURL: "http://192.168.1.23:8000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;


const API_URL = "http://192.168.1.23:8000";