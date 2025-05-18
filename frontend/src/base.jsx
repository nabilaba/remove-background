const backendUrl =
  import.meta.env.MODE === "development"
    ? "http://localhost:8000"
    : "https://rembg.nabilaba.my.id";

export { backendUrl };
