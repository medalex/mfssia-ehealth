import sys, rdflib, pyshacl
d = sys.argv[1]
shapes = rdflib.Graph().parse(f"{d}/review-signal-shapes.ttl")
base = open(f"{d}/examples/valid-signed-absence.ttl").read()
P = """PREFIX rs: <https://mfssia.io/ontology/review-signal#>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX ex: <https://example.org/case#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
"""
cases = {
 "valid: signed absence": None,
 "valid: access refused (Table IV)": """
   DELETE { ex:ssLabB rs:retrievalState rs:DataRetrieved ; rs:hasResponse ex:respLabB .
            ex:authLabB rs:outcomeType rs:Granted .
            ex:fsEGFR rs:confirmationState rs:Confirmed ; prov:wasDerivedFrom ex:recEGFR55 .
            ex:signal1 rs:reportedOutcome rs:NoIssueFound . }
   INSERT { ex:ssLabB rs:retrievalState rs:NoDataRetrieved ; rs:dataRetrievalFailureReason rs:AccessRefused .
            ex:authLabB rs:outcomeType rs:RefusedInvalidResponse .
            ex:fsEGFR rs:confirmationState rs:Unconfirmed ; rs:factReason rs:DataNotRetrieved .
            ex:signal1 rs:reportedOutcome rs:Incomplete . } WHERE {}""",
 "R1: issue without record": """INSERT DATA { ex:signal1 rs:hasDetectedIssue ex:i1 . ex:i1 a rs:DetectedIssue ; rs:concernsFact ex:factEGFR . }
   ;DELETE DATA { ex:signal1 rs:reportedOutcome rs:NoIssueFound . } ;INSERT DATA { ex:signal1 rs:reportedOutcome rs:ReExamine . }""",
 "R2 sources: source without status": "DELETE DATA { ex:signal1 rs:hasSourceStatus ex:ssLabB . }",
 "R2 sources: no data, no reason": """DELETE DATA { ex:ssLabB rs:retrievalState rs:DataRetrieved . } ;
   INSERT DATA { ex:ssLabB rs:retrievalState rs:NoDataRetrieved . }""",
 "R2 sources: retrieved from empty response": """DELETE DATA { ex:respLabB a rs:SignedAbsenceStatement . } ;
   INSERT DATA { ex:respLabB a rs:EmptyDataResponse . }""",
 "R2 sources: retrieved although refused": """DELETE DATA { ex:authLabB rs:outcomeType rs:Granted . } ;
   INSERT DATA { ex:authLabB rs:outcomeType rs:RefusedInvalidResponse . }""",
 "R2 facts: fact without status": "DELETE DATA { ex:signal1 rs:hasFactStatus ex:fsAllergy . }",
 "R2 facts: confirmed without record": "DELETE DATA { ex:fsEGFR prov:wasDerivedFrom ex:recEGFR55 . }",
 "R3: no issue found with unconfirmed fact": """DELETE DATA { ex:fsEGFR rs:confirmationState rs:Confirmed . } ;
   INSERT DATA { ex:fsEGFR rs:confirmationState rs:Unconfirmed ; rs:factReason rs:DataNotRetrieved . }""",
 "R3: issue but no re-examine": """INSERT DATA { ex:signal1 rs:hasDetectedIssue ex:i1 . ex:i1 a rs:DetectedIssue ;
   rs:concernsFact ex:factEGFR ; prov:wasDerivedFrom ex:noteLabB . }""",
 "R4: issue about step counts": """INSERT DATA { ex:signal1 rs:hasDetectedIssue ex:i2 . ex:i2 a rs:DetectedIssue ;
   rs:concernsFact ex:factSteps ; prov:wasDerivedFrom ex:noteLabB . ex:factSteps a rs:RequiredFact . } ;
   DELETE DATA { ex:signal1 rs:reportedOutcome rs:NoIssueFound . } ;INSERT DATA { ex:signal1 rs:reportedOutcome rs:ReExamine . }""",
 "Scope: absence without period": "DELETE WHERE { ex:respLabB rs:periodEnd ?x . }",
}
for name, upd in cases.items():
    g = rdflib.Graph().parse(data=base, format="turtle")
    if upd: g.update(P + upd)
    ok, rg, _ = pyshacl.validate(g, shacl_graph=shapes, advanced=True)
    msgs = sorted({str(m) for m in rg.objects(None, rdflib.URIRef("http://www.w3.org/ns/shacl#resultMessage"))})
    print(("PASS " if ok else "FAIL ") + name); [print("   -", m) for m in msgs]
