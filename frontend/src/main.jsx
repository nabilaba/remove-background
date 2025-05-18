import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { HelmetProvider } from "react-helmet-async";

const theme = extendTheme({
  styles: {
    global: {
      body: {
        fontFamily: "Google Sans,Roboto,Arial,sans-serif",
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <ChakraProvider theme={theme}>
    <BrowserRouter>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </BrowserRouter>
  </ChakraProvider>
);
