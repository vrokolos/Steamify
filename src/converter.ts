import { Game } from "./game";
import * as fs from "fs";
import * as path from "path";
import fetch from "node-fetch";
import * as gm from "gm";

import { MassImporter } from "./importers/massimporter";
import { MassExporter } from "./exporters/massexporter";
import { Utils } from "./utils";
//import { Shield } from "./exporters/shield";
export class Converter {
    static async go() {
        Utils.init();
        let importer = new MassImporter();
        let converter = new Converter();
        let exporter = new MassExporter();

        let config = fs.readFileSync("./config.json", "utf8");
        let games = await importer.getInstalledGames(config);
        games = await converter.fix(games);
        await exporter.sync(games, config);
    }

    static async test() {
        /*let exporter = new Shield();
        let config = JSON.parse(fs.readFileSync("./config.json", "utf8"));
        exporter.sync(null, config.Shield);*/


        //console.log(folders);
    }

    public async fix(games: Game[]): Promise<Game[]> {
        if (!fs.existsSync("./out")) {
            fs.mkdirSync("./out");
        }
        if (!fs.existsSync("./out/pics")) {
            fs.mkdirSync("./out/pics");
        }

        for (let game of games) {
            try {

                let gameExe = game.exec;
                if (gameExe.indexOf("://") == -1) {
                    gameExe = "\"" + path.join(game.folder, game.exec).replace("/", "\\\\").replace(/\\$/g, '') + "\"" + (game.args == "" ? "" : (" " + game.args));
                }

                let gameDir = "\"" + path.join(game.folder, game.workFolder || '').replace("/", "\\\\").replace(/\\$/g, '') + "\\\"";
                let appId = game.name;
                let steamTileFolder = "./out/pics";
                let tileFile = path.join(steamTileFolder, appId + ".jpg");
                if (game.tile == '' || game.tile == null) {
                    let res = await Utils.gist(game.name + " steam tile");
                    let first = res.filter(p => p.height == 430 && p.width == 920)[0];
                    if (first != null) {
                        game.tile = first.url;
                    }
                }

                if (game.tile != '' && game.tile != null) {
                    if (game.fixTile) {
                        await this.portraitToTile(game.tile, tileFile);
                    } else if (game.tile.startsWith("http")) {
                        let req = await fetch(game.tile);
                        let buff = await req.buffer();
                        fs.writeFileSync(tileFile, buff);
                    } else if (!fs.existsSync(tileFile)) {
                        fs.copyFileSync(game.tile, tileFile);
                    }
                } else if (game.poster != '' && game.poster != null) {
                    await this.portraitToTile(game.poster, tileFile);
                } else {
                    tileFile = "";
                }

                let theIcon = null;
                let iconFile = path.join(steamTileFolder, appId + "ico.png");
                if (game.icon != '' && game.icon != null) {
                    let tileFetch = await fetch(game.icon);
                    let buff = await tileFetch.buffer();
                    fs.writeFileSync(iconFile, buff);
                    theIcon = iconFile;
                } else if (gameExe.endsWith(".exe") || gameExe.endsWith(".exe\"")) {
                    theIcon = gameExe;
                } else {
                    fs.copyFileSync("./assets/generic.png", iconFile);
                    theIcon = iconFile;
                }
                game.icon = theIcon;
                game.tile = tileFile;
                game.exec = gameExe;
                game.workFolder = gameDir;
            } catch (e) {
                console.log(e, "Error on game", game);
            }
        }
        return games;
    }

    private async portraitToTile(url: string = '', outfile: string = '') {
        let buff: Buffer = null;
        if (url.startsWith("http")) {
            let req = await fetch(url);
            buff = await req.buffer();
        } else {
            buff = fs.readFileSync(url);
        }

        let s = gm(buff).resize(460, 215, '!').blur(20, 20);
        await this.gmWrite(s, "./out/tempback.png");

        let r = gm(buff).resize(460, 215);
        await this.gmWrite(r, "./out/tempin.png");

        let f = gm(null).command("composite").in("-gravity", "center").in("./out/tempin.png").in("./out/tempback.png");
        await this.gmWrite(f, outfile);
    }

    private async gmWrite(theGm: gm.State, file: string): Promise<void> {
        return new Promise<void>((r, f) => theGm.write(file, (err) => { if (err) { f(err); } else { r(); } }));
    }
}