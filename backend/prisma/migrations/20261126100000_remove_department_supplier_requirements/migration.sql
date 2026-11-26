-- Preserve existing department history while allowing new requisitions without it.
ALTER TABLE `requisitions` MODIFY `departmentId` INTEGER NULL;
