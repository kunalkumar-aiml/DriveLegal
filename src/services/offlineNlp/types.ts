export type StructuredOffenseEntities = {
  Offense: string;
  'Vehicle Type': string;
  State: string;
};

export type LocalLlmConfig = {
  modelPath: string;
};

export const OFFLINE_NLP_MODEL_PATH =
  'file:///data/user/0/com.drivelegal/files/models/gemma-3-1b-it-int4.task';
