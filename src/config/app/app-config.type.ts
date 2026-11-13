export type AppConfig = {
  nodeEnv: string;
  name: string;
  port: number;
  apiPrefix: string;
  labStaleAfterDays: number;
  evidenceReferenceTime?: string;

  dkg: {
    url: string;
    token: string;
    contextGraph: string;
    // draft: Working Memory only (no blockchain); publish: on-chain Verifiable Memory (not implemented yet)
    writeMode: 'draft' | 'publish';
  };

  isDkgMocked: boolean;
};
