import Store from 'electron-store';
import { UserConfig } from './UserConfig.interface';

export class ConfigurationManager {
    private static instance: ConfigurationManager | null = null;
    private store: Store<UserConfig>;

    private constructor() {
        this.store = new Store<UserConfig>({
            defaults: {
                preferredAiProvider: null,
            }
        });
    }

    /**
     * Singleton
     */
    public static getInstance(): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
        }
        return ConfigurationManager.instance;
    }

    /**
     * Get the entire configuration object
     */
    public getConfig(): UserConfig {
        return this.store.store;
    }

    /**
     * Get a specific configuration key (e.g., configManager.get('aiMode'))
     */
    public get<K extends keyof UserConfig>(key: K): UserConfig[K] {
        return this.store.get(key);
    }

    /**
     * Update one or more configuration values (merges with existing)
     */
    public updateConfig(newPartialConfig: Partial<UserConfig>): void {
        this.store.set({
            ...this.store.store,
            ...newPartialConfig,
        });
    }

    /**
     * Reset the configuration to its default values
     */
    public resetToDefaults(): void {
        this.store.clear();
    }
}