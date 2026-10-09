import type { TourStep } from "@/components/tour/SpotlightTour";

export const PLAYER_TOUR: TourStep[] = [
  {
    screen: "fits",
    selector: '[data-tour="tab-fits"]',
    title: "This is your home base",
    body: "Fits shows the open opportunities you match, ranked best first. New ones appear the moment coaches post them.",
  },
  {
    screen: "fits",
    selector: '[data-tour="m-card"]',
    title: "Every card is a real opening",
    body: "Tap a school to see its full page and facilities, or tap I'm Interested to let the coach know you're interested.",
  },
  {
    screen: "fits",
    selector: '[data-tour="m-why"]',
    title: "Transparency",
    body: "Each card shows exactly why you're a fit — position, academics, distance and more.",
  },
  {
    screen: "fits",
    selector: '[data-tour="m-info"]',
    title: "Tooltips",
    body: "See an ⓘ anywhere? Tap it for a simple explainer of how that feature works or how we come up with specific data.",
  },
  {
    screen: "tracker",
    selector: '[data-tour="tab-tracker"]',
    title: "See who's responded",
    body: "My Spots keeps every opportunity you've shown interest in, and whether each coach has responded or closed your interest.",
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
    title: "Build your profile",
    body: "Add a profile photo, upload highlight videos, and post updates — the more complete you are, the more spots you match.",
  },
  {
    screen: "profile",
    install: true,
    title: "Save Athletx to your phone",
    body: "Athletx works better as an app on your home screen — full-screen, one tap away, and it's what makes coach alerts reliable.",
  },
  {
    screen: "fits",
    selector: '[data-tour="m-menu"]',
    title: "Turn on notifications",
    body: "Once you've saved the app to your phone, enable push notifications from the menu up here — so you never miss a connection or a potential fit.",
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
    title: "Showcase your program",
    body: "Program is your public page — add your logo, facility photos and updates so recruits can picture the fit.",
  },
  {
    screen: "program",
    install: true,
    title: "Save Athletx to your phone",
    body: "Athletx works better as an app on your home screen — full-screen, one tap away, and it's what makes recruit alerts reliable.",
  },
  {
    screen: "inbox",
    selector: '[data-tour="m-menu"]',
    title: "Turn on notifications",
    body: "Once you've saved the app to your phone, enable push notifications from the menu up here — so you never miss a new recruit or a mutual match.",
  },
];
