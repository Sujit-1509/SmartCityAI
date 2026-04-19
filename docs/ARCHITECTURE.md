# 🍌 JanSevaAI — System Architecture (Nano Banana Style)

This diagram illustrates the modern, serverless architecture of JanSevaAI, optimized for scalability, speed, and AI-driven precision.

![JanSevaAI Architecture](./jansevaai_architecture.png)

## 🎨 Design Philosophy: Nano Banana
The **Nano Banana** style prioritizes **structural semantic precision** and **vibrant clarity**. By using industry-standard iconography and a clean, flat-design logic flow, it bridges the gap between technical documentation and premium visual communication.

## 🏗️ Technical Stack Breakdown

### 1. Presentation Tier (Edge)
- **User UI**: Built with React (Vite) and Lucide.
- **AWS CloudFront**: A high-speed CDN that caches the frontend globally and ensures low-latency content delivery.

### 2. Logic Tier (Serverless)
- **Amazon API Gateway**: Acts as the traffic cop, routing RESTful requests from the frontend to the correct backend services.
- **AWS Lambda**: The heart of JanSevaAI. 
    - **Logic microservices**: Handle everything from Auth, Complaint submission, and Worker assignment.
    - **AI/NLP microservices**: Perform real-time Vision AI image verification and NLTK-based sentiment analysis on feedback.

### 3. Data Tier (Persistence)
- **Amazon DynamoDB**: A high-performance NoSQL database storing complaints, worker profiles, and sentiment logs.
- **Amazon S3**: Secure object storage for multi-angle complaint photos and high-resolution resolution proofs.

---

## 📈 Request Flow Lifecycle
1. **Initiation**: A citizen uploads a complaint via the React UI.
2. **Distribution**: CloudFront ensures the application JS/CSS is fetched instantly.
3. **Routing**: API Gateway validates the request and forwards it to the `submit-complaint` Lambda.
4. **Intelligence**: The Lambda triggers the Vision AI engine to verify the images.
5. **Persistence**: Validated data is stored in DynamoDB, and images are indexed in S3.
6. **Notification**: The system assigns a worker and updates real-time analytics.
