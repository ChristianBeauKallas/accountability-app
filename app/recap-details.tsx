"use client";

import { useState } from "react";
import type { PlanItems } from "./plan-recap-card";

// The expandable "what they did" list on a feed recap. Workout and meals rows
// get a chevron to reveal the logged sets / individual meals right on the feed.
export default function RecapDetails({
  planItems,
  workoutPhotos = [],
}: {
  planItems: PlanItems;
  workoutPhotos?: string[];
}) {
  const workouts = planItems.workouts ?? [];
  const meals = planItems.meals ?? null;
  const water = planItems.water ?? null;
  const habits = planItems.habits ?? [];

  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [mealsOpen, setMealsOpen] = useState(false);

  const w = workouts[0];
  const exercises = w?.exercises ?? [];
  const workoutExpandable = exercises.length > 0 || workoutPhotos.length > 0;
  const mealItems = meals?.items ?? [];

  return (
    <ul className="pr-list">
      {w && (
        <li className={workoutExpandable ? "pr-expand" : ""}>
          <button
            type="button"
            className="pr-row"
            onClick={() => workoutExpandable && setWorkoutOpen((o) => !o)}
            disabled={!workoutExpandable}
          >
            <span className="pr-ic">🏋️</span>
            <span className="pr-txt">{w.title}</span>
            {w.effort && <span className="pr-badge">felt {w.effort}</span>}
            {workoutExpandable && (
              <span className={`pr-chev ${workoutOpen ? "open" : ""}`}>▾</span>
            )}
          </button>
          {workoutOpen && workoutExpandable && (
            <div className="pr-detail">
              {exercises.map((ex, i) => (
                <div key={i} className="pr-ex">
                  <span className="pr-ex-name">{ex.name}</span>
                  <span className="pr-ex-sets">
                    {ex.sets
                      .map((s) =>
                        s.weight != null && s.reps != null
                          ? `${s.weight}×${s.reps}`
                          : s.reps != null
                            ? `${s.reps} reps`
                            : s.weight != null
                              ? `${s.weight} lb`
                              : "—",
                      )
                      .join(", ")}
                  </span>
                </div>
              ))}
              {workoutPhotos.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={`wp${i}`} className="pr-workout-photo" src={src} alt="Workout" />
              ))}
            </div>
          )}
        </li>
      )}

      {meals && (
        <li className={mealItems.length > 0 ? "pr-expand" : ""}>
          <button
            type="button"
            className="pr-row"
            onClick={() => mealItems.length > 0 && setMealsOpen((o) => !o)}
            disabled={mealItems.length === 0}
          >
            <span className="pr-ic">🍽️</span>
            <span className="pr-txt">
              {meals.count} meal{meals.count === 1 ? "" : "s"} logged
            </span>
            {meals.calories > 0 && (
              <span className="pr-badge">
                {meals.calories}
                {meals.target_calories ? ` / ${meals.target_calories}` : ""} cal
                {meals.protein > 0 ? ` · ${meals.protein}g P` : ""}
              </span>
            )}
            {mealItems.length > 0 && (
              <span className={`pr-chev ${mealsOpen ? "open" : ""}`}>▾</span>
            )}
          </button>
          {mealsOpen && mealItems.length > 0 && (
            <div className="pr-detail">
              {mealItems.map((m, i) => (
                <div key={i} className="pr-meal">
                  <span className="pr-meal-name">{m.detail?.trim() || "Meal"}</span>
                  {(m.calories > 0 || m.protein > 0) && (
                    <span className="pr-meal-macros">
                      {m.calories > 0 ? `${m.calories} cal` : ""}
                      {m.calories > 0 && m.protein > 0 ? " · " : ""}
                      {m.protein > 0 ? `${m.protein}g P` : ""}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </li>
      )}

      {water && (
        <li>
          <div className="pr-row static">
            <span className="pr-ic">💧</span>
            <span className="pr-txt">Water</span>
            <span className="pr-badge">
              {water.oz} {water.unit}
            </span>
          </div>
        </li>
      )}

      {habits.map((h, i) => (
        <li key={`h${i}`}>
          <div className="pr-row static">
            <span className="pr-ic">{h.emoji}</span>
            <span className="pr-txt">{h.label}</span>
            {h.count > 1 && <span className="pr-badge">×{h.count}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}
