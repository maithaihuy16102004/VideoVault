from typing import Dict, Any, List

class AutomationPipelineEngine:
    """
    Rule engine for Auto Promote Triggers, Auto Kill, and Action Recommendations.
    """
    
    def process_automation(self, video_data: Dict[str, Any], ai_strategy: Dict[str, Any], channel_stats: Dict[str, Any]) -> Dict[str, Any]:
        actions = []
        auto_promote_trigger = False
        auto_kill_trigger = False
        
        score = ai_strategy.get("overall_score", 0)
        retention = video_data.get("retentionRate", 0)
        engagement = video_data.get("engagementRate", 0)
        
        # Action System (Heuristic rules)
        if retention < 30:
            actions.append({
                "type": "EDITING",
                "action": "Shorten intro to under 3s",
                "impact": "HIGH"
            })
        
        if engagement < 2.0 and retention > 40:
            actions.append({
                "type": "CONTENT",
                "action": "Add a stronger Call to Action (CTA) at the end",
                "impact": "MEDIUM"
            })
            
        if score > 75 and video_data.get("views", 0) > channel_stats.get("followers", 0) * 0.1:
            actions.append({
                "type": "DISTRIBUTION",
                "action": "Repost at 7PM (Golden Hour) on other platforms",
                "impact": "HIGH"
            })
            
        # Automation Triggers
        # Auto Promote: IF retention > 65% AND velocity > 15 (WARM+) THEN recommend paid boost
        if retention > 60 and score > 70:
            auto_promote_trigger = True
            
        # Auto Kill: IF 3s retention < 20% THEN mark low potential
        # Or if overall score < 40
        if score < 40 or retention < 20:
            auto_kill_trigger = True
            
        return {
            "recommended_actions": actions,
            "auto_promote_trigger": auto_promote_trigger,
            "auto_kill_trigger": auto_kill_trigger,
            "status": "READY_FOR_BOOST" if auto_promote_trigger else "NEEDS_OPTIMIZATION" if auto_kill_trigger else "ORGANIC_GROWTH"
        }
