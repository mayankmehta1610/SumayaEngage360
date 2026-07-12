UPDATE "feature_catalogue"
SET "status" = 'Done', "cursorDone" = true
WHERE "module" = 'Employee Master'
  AND "capability" IN ('Create', 'View/Search', 'Update/History', 'API');
