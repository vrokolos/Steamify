import { Converter } from "./src/converter";

console.log("Locating extraterrestial pigeons");
Converter.go().then(() => console.log("Pigeons escaped radar range"));
