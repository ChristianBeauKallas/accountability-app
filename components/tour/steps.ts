import type { TourStep } from "@/components/tour/SpotlightTour";

export const PLAYER_TOUR: TourStep[] = [
  {
    screen: "fits",
    selector: '[data-tour="tab-fits"]',
    title: "This is your home base",
    body: "Fits shows the open spots you match, ranked best first. New ones appear the moment coaches post them.",
  },
  {
    screen: "fits",
    selector: '[data-tour="m-card"]',
    title: "Every card is a real opening",
    body: "Tap a school to see its full page and facilities, or tap I'm Interested to apply in one tap.",
  },
  {
    screen: "fits",
    selector: '[data-tour="m-why"]',
    title: "No black box",
    body: "Each card shows your match score and exactly why you fit — position, academics, distance and more.",
  },
  {
    screen: "fits-tip",
    selector: '[data-tour="m-tip"]',
    title: "Tooltips everywhere",
    body: "See an ⓘ anywhere? Tap it for a plain-English explainer — like how your fit score is calculated.",
  },
  {
    screen: "tracker",
    selector: '[data-tour="tab-tracker"]',
    title: "Track where you stand",
    body: "My Spots keeps every opening you've shown interest in, and whether each coach has responded.",
  },
  {
    screen: "following",
    selector: '[data-tour="tab-following"]',
    title: "Save schools to revisit",
    body: "Tap the bookmark on any school and it lands in Following so you can come back to it.",
  },
  {
    screen: "profile",
    selector: '[data-tour="tab-profile"]',
    title: "Make your profile shine",
    body: "Add a photo, upload highlight video, and post updates — the more complete you are, the more spots you match.",
  },
];

export const COACH_TOUR: TourStep[] = [
  {
    screen: "inbox",
    selector: '[data-tour="tab-inbox"]',
    title: "Your ranked inbox",
    body: "Inbox shows players who've shown interest, best fit first — no cold DMs to dig through.",
  },
  {
    screen: "needs",
    selector: '[data-tour="tab-needs"]',
    title: "Post what you need",
    body: "In Needs, list the spots you're recruiting for. Only players who actually fit will see them.",
  },
  {
    screen: "following-coach",
    selector: '[data-tour="tab-following"]',
    title: "Keep an eye on players",
    body: "Save players here to revisit as you work through your board.",
  },
  {
    screen: "program",
    selector: '[data-tour="tab-program"]',
    title: "Sell your program",
    body: "Program is your public page — add facilities and updates so recruits can picture the fit.",
  },
];
