import { Game } from "../game";
import { IImporter } from "./importer_iface";
import * as fs from "fs";
import * as path from "path";
import { Utils } from "../utils";

export class Epic implements IImporter {
    public async getInstalledGames(libPath: string): Promise<Game[]> {
        let games: Game[] = [];
        let installListPath = path.join(libPath, "LauncherInstalled.dat");
        if (fs.existsSync(installListPath)) {
            let list = JSON.parse(fs.readFileSync(installListPath, 'utf8')).InstallationList;
            for (let app of list) {
                let gameName = path.basename(app.InstallLocation).replace(/([A-Z])/g, ' $1').trim();
                let steamId = await Utils.steamsearch(gameName);
                let tile = '';
                if (steamId != null) {
                    tile = `http://cdn.akamai.steamstatic.com/steam/apps/${parseInt(steamId).toString()}/header.jpg`;
                }
                let game: Game = {
                    name: gameName,
                    folder: app.InstallLocation,
                    workFolder: '',
                    tag: "Epic",
                    icon: '',
                    tile: tile,
                    args: '',
                    exec: `com.epicgames.launcher://apps/${app.AppName}?action=launch&silent=true`
                };
                console.log(game);

                games.push(game);
            }
        }
        return games;
    }
}