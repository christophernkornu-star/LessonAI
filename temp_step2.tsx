{currentStep === 2 && (
                  <div className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-500">
                    <h3 className="text-lg sm:text-xl font-semibold">
                      Review Your Information
                    </h3>

                    <div className="space-y-4">
                      <div className="grid gap-3 sm:gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Subject
                          </p>
                          <p className="font-medium">
                            {SUBJECTS.find(
                              (s) => s.value === lessonData.subject,
                            )?.label ||
                              lessonData.subject ||
                              "Not set"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Class Level
                          </p>
                          <p className="font-medium">
                            {CLASS_LEVELS.find(
                              (l) => l.value === lessonData.level,
                            )?.label ||
                              lessonData.level ||
                              "Not set"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Strand
                          </p>
                          <p className="font-medium">
                            {availableStrands.find(
                              (s) => s.value === lessonData.strand,
                            )?.label ||
                              lessonData.strand ||
                              "Not set"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Class Size
                          </p>
                          <p className="font-medium">
                            {lessonData.classSize || "Not set"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Teaching Philosophy
                          </p>
                          <p className="font-medium capitalize">
                            {lessonData.philosophy?.replace("-", " ") ||
                              "Balanced"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Detail Level
                          </p>
                          <p className="font-medium capitalize">
                            {lessonData.detailLevel?.replace("-", " ") ||
                              "Moderate"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Diagram Outlines
                          </p>
                          <p className="font-medium">
                            {lessonData.includeDiagrams
                              ? "Included"
                              : "Not included"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">
                          Content Standard
                        </p>
                        <p className="font-medium">
                          {lessonData.contentStandard || "Not set"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">
                          Curriculum Files
                        </p>
                        <p className="font-medium">
                          {selectedCurriculumFiles.length} files selected
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">
                          Template
                        </p>
                        <p className="font-medium">
                          {selectedTemplate?.name || "Default template"}
                        </p>
                      </div>
                    </div>

                    {!isOnline && (
                      <Alert>
                        <WifiOff className="h-4 w-4" />
                        <AlertDescription>
                          You're currently offline. Please connect to the
                          internet to generate your lesson note.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}