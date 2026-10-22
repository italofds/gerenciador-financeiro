import { createApp } from "vue";
import "vue-sonner/style.css";
import "./styles.css";
import App from "./App.vue";
import { createAppRouter } from "./router";

createApp(App).use(createAppRouter()).mount("#app");
