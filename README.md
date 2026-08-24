# coursegram.ai

AI powered personalized learning path recommender.


## Backend

The backend is a small FastAPI service.

### Setup

```
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```


## Notes

- Course data comes from Coursera's public catalog listing endpoint. It does not support full text search on this tier, so filtering happens locally after fetching a batch.
- Roadmap topic lists are static seed files under `backend/app/data/roadmaps`, sourced from roadmap.sh. They are a flat reference list of skill names, not a full prerequisite graph. That structure is planned for a later phase.
