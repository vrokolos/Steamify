import { Game } from "../game";
import { Shortcuter } from "./steam";
import { IExporter } from "./exporter_iface";
import { Shield } from "./shield";

export class MassExporter implements IExporter {
    public async sync(games: Game[], libPath: string): Promise<void> {
        let config = JSON.parse(libPath);
        let exporters = [
            { exp: new Shortcuter(), lib: config.Steam },
            { exp: new Shield(), lib: config.Steam }
        ];
        for (let exp of exporters) {
            await exp.exp.sync(games, exp.lib);
        }
    }
}