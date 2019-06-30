import { Game } from "../game";
import { IImporter } from "./importer_iface";
import * as fs from "fs";
import * as path from "path";
import klaw = require("klaw-sync");
import fetch from "node-fetch";
import { Utils } from "../utils";

export class Gog implements IImporter {
    public async getInstalledGames(): Promise<Game[]> {
        let p = path.join(process.env.ALLUSERSPROFILE, "GOG.com", "Galaxy", "config.json");
        let conf = fs.readFileSync(p, "utf8");
        let config = JSON.parse(conf);
        let f = config.installationPaths as string[];
        let libPath1 = config.libraryPath;
        if (f.indexOf(libPath1) == -1) {
            f.push(libPath1);
        }
        f = f.filter(p => fs.existsSync(p));
        let res = await Promise.all(f.map(p => this.procFolder(p)));
        let games = res.reduce((a, b) => a.concat(b));
        Utils.logImport("GOG", f.join(" "), games);
        return games;
    }

    public async procFolder(libPath: string) {
        let games: Game[] = [];
        let opts: klaw.Options = { nodir: true, traverseAll: true, filter: file => file.path.indexOf("goggame") > -1 && path.extname(file.path) == ".info" };
        const packages = klaw(libPath, opts);
        for (let pac of packages) {
            try {
                let obj = JSON.parse(fs.readFileSync(pac.path, "utf8"));
                let playTask = obj.playTasks.find(p => p.category == "game");
                if (playTask == null) {
                    playTask = obj.playTasks[0];
                }
                let apiFetch = await fetch(`https://api.gog.com/products/${obj.gameId}`);
                let api = await apiFetch.json();
                let newGame = {
                    icon: api.images.icon == null ? '' : 'http:' + api.images.icon,
                    tile: 'http:' + api.images.logo2x.replace("glx_logo_2x", "ggvgm"),
                    name: obj.name,
                    exec: playTask.path,
                    args: playTask.arguments || '',
                    folder: path.dirname(pac.path),
                    workFolder: playTask.workingDir || '',
                    tag: "GOG"
                };
                games.push(newGame);
            }
            catch (e) {
                console.log(`Failed to import installed GOG game ${pac.path}.`, e);
            }
        }
        return games;
    }
}