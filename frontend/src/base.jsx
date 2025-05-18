const backendUrl =
  import.meta.env.MODE === "development"
    ? "http://localhost:8000"
    : "https://rembg.nabil.my.id";

export { backendUrl };
