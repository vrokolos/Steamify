import { Game } from "../game";
import { IImporter } from "./importer_iface";
import { Gog } from "./gog";
import { Origin } from "./origin";
import { Uplay } from "./uplay";
import { Bnet } from "./bnet";

export class MassImporter implements IImporter {
    public async getInstalledGames(libPath: string): Promise<Game[]> {
        let config = JSON.parse(libPath);
        let importers: { imp: IImporter, lib: string }[] = [
            { imp: new Gog(), lib: config.GOG },
            { imp: new Origin(), lib: config.Origin },
            { imp: new Uplay(), lib: config.Uplay },
            { imp: new Bnet(), lib: config.Bnet }
        ];

        let results = await Promise.all(importers.map(p => p.imp.getInstalledGames(p.lib)));
        let games: Game[] = [];
        for (let p of results) {
            games = games.concat(p);
        }
        return games;
    }
}