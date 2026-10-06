import type { TourStep } from "@/components/tour/SpotlightTour";

export const PLAYER_TOUR: TourStep[] = [
  {
    selector: '[data-tour="tab-fits"]',
    title: "This is your home base",
    body: "Fits shows the open spots you match, ranked best first. New ones appear the moment coaches post them.",
  },
  {
    selector: '[data-tour="fit-card"]',
    title: "Every card is a real opening",
    body: "Tap a school's name to see its full page and facilities, or tap I'm Interested to apply in one tap.",
  },
  {
    selector: '[data-tour="fit-why"]',
    title: "No black box",
    body: "Each card shows your match score and exactly why you fit — position, academics, distance and more.",
  },
  {
    selector: '[data-tour="fits-info"]',
    title: "Tooltips everywhere",
    body: "See an ⓘ? Tap it anytime for a plain-English explainer — like how your fits are calculated.",
  },
  {
    selector: '[data-tour="tab-tracker"]',
    title: "Track where you stand",
    body: "My Spots keeps every spot you've shown interest in, and whether each coach has responded.",
  },
  {
    selector: '[data-tour="tab-following"]',
    title: "Save schools to revisit",
    body: "Tap the ☆ on any school or fit and it lands in Following so you can come back to it.",
  },
  {
    selector: '[data-tour="tab-profile"]',
    title: "Finish strong",
    body: "In Profile: add a photo, upload highlight videos, and post updates so coaches following you see what you're up to.",
  },
];

export const COACH_TOUR: TourStep[] = [
  {
    selector: '[data-tour="tab-inbox"]',
    title: "Your ranked inbox",
    body: "Inbox shows players who've shown interest, best fit first — no cold DMs to dig through.",
  },
  {
    selector: '[data-tour="tab-needs"]',
    title: "Post what you need",
    body: "In Needs, list the spots you're recruiting for. Only players who actually fit will see them.",
  },
  {
    selector: '[data-tour="tab-following"]',
    title: "Keep an eye on players",
    body: "Save players here to revisit as you work through your board.",
  },
  {
    selector: '[data-tour="tab-program"]',
    title: "Sell your program",
    body: "Program is your public page — add facilities and updates so recruits can picture the fit.",
  },
];
