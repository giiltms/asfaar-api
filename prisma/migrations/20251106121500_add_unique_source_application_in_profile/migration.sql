-- Add unique constraint on sourceApplicationId for one-to-one mapping between application and profile
CREATE UNIQUE INDEX "travel_agent_profiles_sourceApplicationId_key" ON "travel_agent_profiles"("sourceApplicationId");
