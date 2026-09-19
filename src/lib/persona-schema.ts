export type ProvenanceSource = "SparkToro export" | "customer voice import" | "inference";

export type ProvenanceEntry = {
  field: string;
  source: string;
  note: string;
};

export type PersonaStructured = {
  personaName: string;
  roleAndDemographics: string;
  mediaDiet: string[];
  interestsAndAffinities: string[];
  customerVoiceHighlights: string[];
  likelyVocabularyAndTone: string;
  whatGoodAlreadyLooksLike: string;
  skepticismProfile: string;
  summary: string;
  dataProvenance: ProvenanceEntry[];
};

export type ParseReport = {
  sparktoro: { fileName: string; sheets: { sheet: string; rows: number }[] }[];
  sparktoroPastedText: boolean;
  customerVoice: { fileName: string; sheets: { sheet: string; rows: number }[]; kind: string }[];
  customerVoicePastedText: boolean;
};

export type Rating = { rating: number; reasoning: string };

export type FeedbackResult = {
  executiveSummary: {
    overallVerdict: string;
    oneLineSummary: string;
  };
  gutReaction: string;
  blinkTest: {
    verdict: "walks by / scrolls past" | "brief pause, keeps moving" | "stops to look closer";
    whatRegistersInWindow: string;
    reasoning: string;
  };
  messageClarity: Rating;
  visualHierarchy: Rating;
  credibilityAndTrust: Rating;
  emotionalResonance: Rating;
  genericVsDistinct: string;
  predictedAction: string;
  biggestFriction: string[];
  biggestOpportunity: string;
  personaQuote: string;
  confidenceNote: string;
  buyerJourneyReactions: {
    awareness: string;
    consideration: string;
    decision: string;
    potentialPartner: string;
  };
  visualCallouts: {
    number: number;
    designImageNumber: number;
    label: string;
    approxX: number;
    approxY: number;
    note: string;
  }[];
};

export type ReferenceExample = { url: string; note: string };

export const DESIGN_TYPES = [
  "Email",
  "Trade show / booth graphic",
  "Social ad",
  "Landing page",
  "Direct mail",
  "Other",
] as const;

export const DISCLAIMER =
  "This is a directional AI-simulated reaction, not real user research. Use it to catch obvious problems early and prioritize what to test with real people, not as a substitute for real feedback.";
