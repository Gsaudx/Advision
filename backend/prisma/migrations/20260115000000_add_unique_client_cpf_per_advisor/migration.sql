-- CreateIndex
CREATE UNIQUE INDEX "clients_advisorId_cpf_key" ON "clients"("advisorId", "cpf");
