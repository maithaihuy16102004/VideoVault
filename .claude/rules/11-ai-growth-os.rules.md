# AI Growth Intelligence Operating System Rules

## 1. Core Mindset
Hệ thống không chỉ "HIỂN THỊ DỮ LIỆU" (Analytics Dashboard) mà phải "RA QUYẾT ĐỊNH" (Decision Intelligence System).
Phục vụ như một "TikTok AI Copilot" cho fashion creators/shops.

## 2. Kiến trúc Data & AI
### Database Architecture
Bắt buộc phải có:
- **Video Snapshot Table (`video_metrics_snapshots`)**: Lưu lịch sử (video_id, timestamp, views, likes, comments, shares, saves, watch_time, retention_3s, retention_5s, retention_curve) để vẽ biểu đồ velocity & heatmap.
- **Prediction Table (`video_predictions`)**: Lưu virality_score, confidence, expected_views_24h, cluster_id.
- **Content Embedding Table (`video_embeddings`)**: Dùng CLIP, OpenAI embeddings, fashion similarity để tính toán cluster.

### AI Architecture Chuẩn
KHÔNG dùng LLM để chấm điểm trực tiếp. LLM chỉ dùng để explain, summarize, recommend.
- **Layer 1 - Statistical Engine**: Tính toán retention math, velocity, growth curves.
- **Layer 2 - ML Prediction**: Sử dụng XGBoost/LightGBM/CatBoost để predict virality, growth, promote ROI.
- **Layer 3 - Vision AI**: Detect scene, outfit clustering, color analysis, framing.
- **Layer 4 - LLM Explainability**: Giải thích lý do, tạo hook/CTA mới.

## 3. Cấu trúc UI & Metrics
### Profile Layer (Account)
Không dùng basic metrics. Cần có:
- **Account Health Score**: Đo lường consistency, posting frequency, audience overlap, retention stability.
- **Content DNA**: Style của creator (VD: Douyin aesthetic, Soft-girl fashion).
- **Audience Profile**: Nhóm tuổi, active hours (giờ vàng), interest overlap, returning viewers.
- **Content Consistency**: Tần suất upload, trend (tăng/giảm).

### Overview Layer
Thay vì Avg views, sử dụng:
- **Median Views**: Số view trung vị.
- **Velocity Trend**: Growth velocity (VD: +18% weekly).
- **Viral Hit Rate**: Tỷ lệ video viral (VD: 2/10).
- **Retention Stability**: Độ ổn định của retention.

### Video Card Hierarchy
Phân cấp metric rõ ràng:
- **Tầng 1 - Attention**: Hook score, Scroll stop rate, First 3s retention.
- **Tầng 2 - Retention**: Avg watch time, Completion, Rewatch rate.
- **Tầng 3 - Engagement**: Save rate, Share rate, Comment velocity.
- **Tầng 4 - Conversion**: Profile CTR, Product CTR, Follow conversion.

### Weighted Engagement Score
Thay vì (like+comment+share)/views, dùng:
`Engagement Score = Like*1 + Comment*4 + Share*8 + Save*10 + Follow conversion*12`

## 4. Intelligence Engines
### Retention Engine
Bắt buộc có context:
- **Retention Curve**: 0-3s, 3-5s, 5-8s...
- **Drop-off Points**: Chỉ ra giây rớt view nhiều nhất.
- **Rewatch Spike**: Đoạn người xem replay.
- **Scene Correlation**: Cảnh nào giữ retention tốt (VD: Close-up outfit transition).

### AI Score & Explainability
- **Sub-score decomposition**: Hook, Retention, Engagement, Viral Potential.
- **Confidence**: % độ tự tin của AI.
- **Prediction Window**: Expected 24h views range.
- **Explainability**: Lý do rõ ràng tại sao điểm cao/thấp.

### Dynamic Target Views
- **Dynamic Goal**: Đặt Expected và Stretch goal.
- **Probability**: Xác suất đạt được.
- **Time Forecast**: ETA hoàn thành.

### "Why this video worked" (Viral Reasoning)
Phân tích chi tiết:
- Visual Pattern (ánh sáng, góc máy, màu sắc).
- Hook Pattern (Loại hook).
- Audio Analysis (Trend strength).
- Caption Analysis.

### Trend Engine
- **Rising Trend**: Alert trend đang lên.
- **Saturation**: Cảnh báo trend đã bão hòa.
- **Competitor Overlap**: Mức độ cạnh tranh trong niche.

### Clustering
- Gom nhóm video theo style/context (VD: Indoor mirror, Outdoor cafe) và so sánh hiệu suất giữa các cluster.

### Action System & Automation
- **Action System**: Đưa ra hành động cụ thể (repost giờ nào, cắt ngắn intro, chỉnh màu thumbnail).
- **Automation Pipeline**:
  - Auto Promote Trigger (IF retention > 65% AND velocity rising THEN recommend paid boost)
  - Auto Kill (IF 3s retention < 20% THEN mark low potential)

### Mission Control UI Elements
- Retention Heatmaps.
- Velocity Trend graphs.
- AI Timeline (VD: 0-2h slow, 2-4h accelerating, 4-6h breakout).
- Video compare mode (Viral vs Flop).
