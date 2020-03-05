import { Converter } from "./src/converter";
import { Utils } from "./src/utils";

console.log("Locating extraterrestial pigeons");
/*Utils.gist("\"The Bard’s Tale IV Director’s Cut\" game poster").then(p => {
    console.log(p);
});*/
Converter.go().then(() => console.log("Pigeons escaped radar range"));
//Converter.test().then(() => console.log("Pigeons escaped radar range"));