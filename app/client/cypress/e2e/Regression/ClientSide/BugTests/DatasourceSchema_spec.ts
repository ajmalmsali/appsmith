import { featureFlagIntercept } from "../../../../support/Objects/FeatureFlags";
import { ObjectsRegistry } from "../../../../support/Objects/Registry";

const agHelper = ObjectsRegistry.AggregateHelper,
  dataSources = ObjectsRegistry.DataSources,
  ee = ObjectsRegistry.EntityExplorer;

let guid;
let dataSourceName: string;
describe("Datasource form related tests", function () {
  it("1. Bug - 17238 Verify datasource structure refresh on save - invalid datasource", () => {
    agHelper.GenerateUUID();
    cy.get("@guid").then((uid) => {
      guid = uid;
      dataSourceName = "Postgres " + guid;
      ee.ExpandCollapseEntity("Datasources");
      dataSources.NavigateToDSCreateNew();
      dataSources.CreatePlugIn("PostgreSQL");
      agHelper.RenameWithInPane(dataSourceName, false);
      dataSources.FillPostgresDSForm(
        "production",
        false,
        "docker",
        "wrongPassword",
      );
      dataSources.VerifySchema(
        dataSourceName,
        "An exception occurred while creating connection pool.",
      );
      agHelper.GetNClick(dataSources._editButton);
      dataSources.UpdatePassword("docker");
      dataSources.VerifySchema(dataSourceName, "public.", true);
      agHelper.GetNClick(dataSources._createQuery);
    });
  });

  it("2. Verify if schema was fetched once #18448", () => {
    agHelper.RefreshPage();
    ee.ExpandCollapseEntity("Datasources");
    ee.ExpandCollapseEntity(dataSourceName, false);
    cy.intercept("GET", dataSources._getStructureReq).as("getDSStructure");
    ee.ExpandCollapseEntity("Datasources");
    ee.ExpandCollapseEntity(dataSourceName);
    agHelper.Sleep(1500);
    agHelper.VerifyCallCount(`@getDatasourceStructure`, 1);
    dataSources.DeleteQuery("Query1");
    dataSources.DeleteDatasouceFromWinthinDS(dataSourceName);
  });

  it(
    "excludeForAirgap",
    "3. Verify if schema (table and column) exist in query editor and searching works",
    () => {
      featureFlagIntercept(
        {
          ab_ds_schema_enabled: true,
        },
        false,
      );
      agHelper.RefreshPage();
      dataSources.CreateMockDB("Users");
      dataSources.CreateQueryAfterDSSaved();
      dataSources.VerifyTableSchemaOnQueryEditor("public.users");
      ee.ExpandCollapseEntity("public.users");
      dataSources.VerifyColumnSchemaOnQueryEditor("id");
      dataSources.FilterAndVerifyDatasourceSchemaBySearch(
        "gender",
        true,
        "column",
      );
    },
  );

  // the full list for schema-less plugins can be found here. https://www.notion.so/appsmith/Don-t-show-schema-section-for-plugins-that-don-t-support-it-78f82b6abf7948c5a7d596ae583ed8a4?pvs=4#3862343ca2564f7e83a2c8279965ca61
  it("4. Verify schema does not show up in schema-less plugins", () => {
    featureFlagIntercept(
      {
        ab_ds_schema_enabled: true,
      },
      false,
    );
    agHelper.RefreshPage();
    dataSources.CreateDataSource("Redis", true, false);
    dataSources.CreateQueryAfterDSSaved();
    dataSources.VerifySchemaAbsenceInQueryEditor();
  });
});
