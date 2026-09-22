-- DropForeignKey
ALTER TABLE "FieldOption" DROP CONSTRAINT "FieldOption_fieldId_fkey";

-- DropForeignKey
ALTER TABLE "FormField" DROP CONSTRAINT "FormField_groupId_fkey";

-- DropForeignKey
ALTER TABLE "FormSection" DROP CONSTRAINT "FormSection_formId_fkey";

-- DropForeignKey
ALTER TABLE "InputGroup" DROP CONSTRAINT "InputGroup_sectionId_fkey";

-- AddForeignKey
ALTER TABLE "FormSection" ADD CONSTRAINT "FormSection_formId_fkey" FOREIGN KEY ("formId") REFERENCES "dynamic_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InputGroup" ADD CONSTRAINT "InputGroup_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "FormSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "InputGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldOption" ADD CONSTRAINT "FieldOption_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "FormField"("id") ON DELETE CASCADE ON UPDATE CASCADE;
