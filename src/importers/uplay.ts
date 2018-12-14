import { Game } from "../game";
import { IImporter } from "./importer_iface";
import * as fs from "fs";
import * as path from "path";
import { Utils } from "../utils";

export class Uplay implements IImporter {
    private root = "HKLM\\SOFTWARE\\ubisoft\\Launcher\\Installs\\";
    public async getInstalledGames(libPath: string): Promise<Game[]> {
        let installsKey = await Utils.GetReg(this.root);
        if (installsKey == null || installsKey.keys == null) {
            return [];
        }
        let data = fs.readFileSync(path.join(libPath, "configuration", "configurations"), "utf8");
        let games: Game[] = [];
        for (let install of installsKey.keys) {
            try {
                let gameData = await Utils.GetReg(this.root + install);
                let installDir = (gameData.values["InstallDir"].value as string).replace('/', "\\");

                let newGame = new Game();
                newGame.tag = "Uplay";
                newGame.name = path.basename(installDir, path.extname(installDir));
                newGame.folder = installDir;
                newGame.exec = `uplay://launch/${install}`;
                newGame.poster = libPath + "/assets/" + this.getCachedLogoFile(newGame.name, data);

                games.push(newGame);
            } catch (ex) {
                console.log(`error :`, ex);
            }
        }
        return games;
    }

    private getCachedLogoFile(game: string, data: string): string {
        let match = `\"${game}(?:\n|.)*?THUMBIMAGE\: (.*?)\n`;
        let regex = new RegExp(match, "gim");
        let res = regex.exec(data);
        if (res) {
            return res[1];
        } else {
            let match2 = `${game}\"(?:\n|.)*?thumb_image\: (.*?)\n`;
            let regex2 = new RegExp(match2, "gim");
            let res2 = regex2.exec(data);
            if (res2) {
                return res2[1];
            }
        }
        return null;
    }
}