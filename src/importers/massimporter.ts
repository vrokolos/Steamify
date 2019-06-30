import { Game } from "../game";
import { IImporter } from "./importer_iface";
import { Gog } from "./gog";
import { Origin } from "./origin";
import { Uplay } from "./uplay";
import { Bnet } from "./bnet";
import { Custom } from "./custom";
import { Epic } from "./epic";

export class MassImporter implements IImporter {
    public async getInstalledGames(libPath: string): Promise<Game[]> {
        let config = JSON.parse(libPath);
        let importers: { imp: IImporter, lib: string }[] = [
            { imp: new Gog(), lib: null },
            { imp: new Origin(), lib: null },
            { imp: new Epic(), lib: null },
            { imp: new Bnet(), lib: null },

            { imp: new Uplay(), lib: null },
            { imp: new Custom(), lib: config.Custom }
        ];

        let results = await Promise.all(importers.map(p => p.imp.getInstalledGames(p.lib)));
        let games: Game[] = [];
        for (let p of results) {
            games = games.concat(p);
        }
        return games;
    }
}