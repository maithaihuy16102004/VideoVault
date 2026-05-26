# AI Promotion Policy

## Purpose

This document defines how the TikTok Promotion Intelligence system is allowed to make and explain paid promotion recommendations.

The system is a decision-support engine. It does not guarantee follower growth, sales, revenue, or campaign profitability.

## Decision Modes

### QUICK_SCAN

QUICK_SCAN analyzes the latest 6-12 public videos.

Allowed actions:
- TEST_SMALL
- NEED_MORE_DATA
- NEED_PRIVATE_ANALYTICS

Blocked actions:
- SCALE

Policy:
- Quick Scan is for fast signal reading only.
- Quick Scan must not be used to scale budget.
- Any SCALE recommendation generated before guardrails must be downgraded before returning to the user.

### FULL_CHANNEL_ANALYSIS

FULL_CHANNEL_ANALYSIS analyzes the full public channel where possible, or at least 50-200 recent videos.

It should build:
- channel baseline
- historical winners
- weak performers
- creative archetypes
- objective-specific candidate sets

Policy:
- Full channel analysis is required before serious paid recommendations.
- Full channel analysis alone still does not unlock aggressive scale.
- Strong scale requires verified paid campaign history.

## Evidence Levels

Recommendations must expose the evidence level used.

Allowed values:
- ESTIMATED
- PUBLIC_ONLY
- COMPETITOR_BENCHMARK
- PRIVATE_ANALYTICS
- PAID_HISTORY_VERIFIED

Scale policy:
- If evidenceLevel is not PAID_HISTORY_VERIFIED, SCALE is blocked.
- Viral organic performance is not enough to unlock SCALE.
- Curated benchmark data is advisory only and must not be presented as live market data.

## Competitive Data Policy

When live competitor crawling is not enabled or does not return real market data, the system must clearly say:

Competitive data: curated benchmark, not live market data.

Live competitor data may inform:
- niche archetypes
- winning hooks
- creative gaps
- objective hypotheses

Live competitor data does not prove paid performance unless connected to paid campaign results.

## Objective Policy

The system must not choose a single generic "top 6" by one score.

It must separate recommendations by objective:
- awareness
- followers
- profile views
- sales/messages

Final campaign mix should be assembled from objective-specific candidates and the user's business goal.

## Saturation Policy

If a video is already above channel p90 views, VIDEO_VIEWS should be suppressed.

Allowed remap targets:
- PROFILE_VIEWS
- MESSAGES
- PRODUCT_CLICKS
- DO_NOT_PROMOTE

The system should avoid spending money to buy views for content that has already saturated organically unless there is verified paid-history evidence for the target objective.

## Business Stage Policy

Account stage affects objective choice.

Supported stages:
- NEW_CREATOR
- SMALL_SHOP
- GROWING_CREATOR
- BRAND
- CELEBRITY

Examples:
- Small creator with strong profile pull: prefer PROFILE_VIEWS or FOLLOWERS.
- Small shop with buying intent: prefer MESSAGES or PRODUCT_CLICKS.
- Large account with strong organic reach: avoid VIDEO_VIEWS unless there is verified paid objective history.

## Campaign Learning Policy

The system becomes an optimizer only after paid results are connected.

Each campaign result should store:
- spend
- CPV
- CPF
- cost_per_profile_view
- cost_per_message
- CTR
- paid retention
- conversion
- objective_success
- archetype

Campaign history must feed future decisions:
- confidence
- objective
- budget range
- risk
- archetype performance

## Pilot Policy

Before scaling, run 10-20 small campaigns.

Recommended pilot budget:
- 50,000-100,000 VND per day per campaign

Pilot goals:
- validate objective fit
- measure paid KPI by archetype
- detect misleading organic virality
- build PAID_HISTORY_VERIFIED evidence

## Audit Policy

Every recommendation should expose and store:
- before_guardrail
- after_guardrail
- rules_triggered
- why_objective_changed
- warnings
- evidenceLevel

Admin dashboard path:
- /admin/promotion-audit

Backend audit endpoint:
- GET /api/admin/promotion-audit

This audit log is required for debugging and for answering user questions like "why did AI recommend this objective?"

## Monitoring Policy

Production monitoring should track:
- crawler errors
- Gemini rate limit events
- fallback mode calls
- missing field events
- decision latency
- recommendations blocked from SCALE

Monitoring should be reviewed during pilot campaigns before expanding budget.
