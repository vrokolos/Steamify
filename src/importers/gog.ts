import { Game } from "../game";
import { IImporter } from "./importer_iface";
import * as fs from "fs";
import * as path from "path";
import klaw = require("klaw-sync");
import fetch from "node-fetch";

export class Gog implements IImporter {
    public async getInstalledGames(libPath: string): Promise<Game[]> {
        let games: Game[] = [];

        if (fs.existsSync(libPath)) {
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
                } catch (e) {
                    console.log(`Failed to import installed GOG game ${pac.path}.`, e);
                }
            }
        }
        return games;
    }
}